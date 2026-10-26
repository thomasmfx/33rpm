package br.com.rpm33.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.Troca;

public interface TrocaRepository extends JpaRepository<Troca, Long> {

  List<Troca> findByPedidoIdInOrderByIdAsc(Collection<Long> pedidoIds);

  List<Troca> findAllByOrderByIdDesc();

  /** O dono da compra de cada troca, sem carregar os pedidos inteiros. */
  @Query("select t.id, t.pedido.cliente.id from Troca t where t.id in :ids")
  List<Object[]> clientesDas(@Param("ids") Collection<Long> ids);
}
