package br.com.rpm33.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.ItemCarrinho;

public interface ItemCarrinhoRepository extends JpaRepository<ItemCarrinho, Long> {

  List<ItemCarrinho> findByClienteIdOrderByIdAsc(Long clienteId);

  Optional<ItemCarrinho> findByClienteIdAndDiscoId(Long clienteId, Long discoId);

  /** RN0044: clientes cuja inclusão mais recente já passou do prazo. */
  @Query("select c.clienteId from ItemCarrinho c where c.isExpirado = false "
      + "group by c.clienteId having max(c.dataInclusao) <= :limite")
  List<Long> clientesComPrazoVencido(@Param("limite") LocalDateTime limite);

  /**
   * RN0044: o que os carrinhos ainda no prazo bloqueiam de cada disco, fora o do
   * cliente informado. O prazo vale pelo carrinho, então a inclusão mais recente do
   * dono decide.
   */
  @Query("select c.discoId, sum(c.quantidade) from ItemCarrinho c "
      + "where c.discoId in :discoIds and c.clienteId <> :clienteId and c.isExpirado = false "
      + "and (select max(o.dataInclusao) from ItemCarrinho o "
      + "where o.clienteId = c.clienteId and o.isExpirado = false) > :limite "
      + "group by c.discoId")
  List<Object[]> bloqueadosPorOutros(@Param("discoIds") Collection<Long> discoIds,
      @Param("clienteId") Long clienteId, @Param("limite") LocalDateTime limite);

  /** Teste e demonstração (perfil dev): o carrinho fica como se o tempo tivesse passado. */
  @Modifying
  @Query(value = "UPDATE carrinho_item SET data_inclusao = data_inclusao - "
      + "(:minutos * interval '1 minute') WHERE cliente_id = :clienteId", nativeQuery = true)
  int envelhecer(@Param("clienteId") Long clienteId, @Param("minutos") int minutos);
}
