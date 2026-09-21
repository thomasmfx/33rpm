package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Cidade;
import br.com.rpm33.model.Estado;

public interface CidadeRepository extends JpaRepository<Cidade, Long> {

  Optional<Cidade> findByDescIgnoreCaseAndEstado(String desc, Estado estado);
}
