package br.com.rpm33.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Treinamento;

public interface TreinamentoRepository extends JpaRepository<Treinamento, Long> {

  List<Treinamento> findAllByOrderByIdDesc();

  List<Treinamento> findByStatus(String status);

  Optional<Treinamento> findFirstByStatusAndModeloBaseOrderByDataConclusaoDescIdDesc(
      String status, String modeloBase);
}
